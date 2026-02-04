import supabase from "./supabase.js";

/**
 * Centralized authentication handler for cookie and password-based auth
 */
export class Auth {
    #req;
    #authHeader;
    #sessionCookie;

    /**
     * @param {Object} req - Express request object
     * @throws {Error} If req is not a valid object
     */
    constructor(req) {
        if (!req || typeof req !== 'object') {
            throw new Error('Auth constructor requires a valid request object');
        }
        this.#req = req;
        this.#authHeader = req.headers?.authorization || null;
        this.#sessionCookie = req.cookies?.['__Host-session'] || null;
    }

    /**
     * Check if Authorization header exists
     * @private
     * @returns {boolean}
     */
    // #hasAuthHeader() {
    //     return !!this.#authHeader;
    // }

    /**
     * Check if session cookie exists
     * @private
     * @returns {boolean}
     */
    // #hasCookie() {
    //     return !!this.#sessionCookie;
    // }

    /**
     * Verify if password in Authorization header matches expected password
     * @private
     * @returns {boolean}
     */
    #authHeaderPasswordMatch() {
        if (!this.#authHeader?.startsWith('Basic ')) {
            return false;
        }

        try {
            const encodedPassword = this.#authHeader.replace('Basic ', '');
            const expectedPassword = process.env.data_password;
            const decodedPassword = Buffer.from(encodedPassword, 'base64').toString();

            return decodedPassword === expectedPassword;
        } catch (error) {
            console.error('Error decoding auth header:', error);
            return false;
        }
    }

    /**
     * Check if cookie exists in database and is verified
     * @private
     * @returns {Promise<{found: boolean, verified: boolean, id: string|null}>}
     */
    async #isCookieVerified() {
        const falseReturnObject = { found: false, verified: false, id: null };

        if (!this.#sessionCookie) {
            return falseReturnObject;
        }

        try {
            const dbResponse = await supabase
                .from('user_cookies')
                .select()
                .eq('cookie_string', this.#sessionCookie);

            if (dbResponse.error) {
                console.error('Database error checking cookie:', dbResponse.error);
                return falseReturnObject;
            }

            if (dbResponse.data.length > 0) {
                const record = dbResponse.data[0];
                return {
                    found: true,
                    verified: record.is_verified,
                    id: record.record_id
                };
            }

            return falseReturnObject;
        } catch (error) {
            console.error('Unexpected error checking cookie:', error);
            return falseReturnObject;
        }
    }

    /**
     * Create a new verified cookie in the database
     * @private
     * @returns {Promise<{success: boolean, cookie: string|null, id: string|null}>}
     */
    async #createCookie() {
        const falseReturnObject = { success: false, cookie: null, id: null };

        try {
            const dbResponse = await supabase
                .from('user_cookies')
                .insert({ is_verified: true })
                .select();

            if (dbResponse.error) {
                console.error('Database error creating cookie:', dbResponse.error);
                return falseReturnObject;
            }

            const record = dbResponse.data[0];
            return {
                success: true,
                cookie: record.cookie_string,
                id: record.record_id
            };
        } catch (error) {
            console.error('Unexpected error creating cookie:', error);
            return falseReturnObject;
        }
    }

    /**
     * Main verification method
     * Checks Authorization header first, then cookie as fallback
     * @returns {Promise<{verified: boolean, reason: string, newCookie: string|null}>}
     */
    async isVerified() {
        const returnObject = { verified: false, reason: '', newCookie: null };

        // Check Authorization header first
        if (this.#authHeader) {
            if (!this.#authHeader.startsWith('Basic ')) {
                return {...returnObject, reason: 'Invalid Authorization header format'};
            }

            if (!this.#authHeaderPasswordMatch()) {
                return {...returnObject, reason: 'Authorization header password does not match'};
            }

            // Password matched, create new cookie
            const cookieResult = await this.#createCookie();
            return {
                verified: true,
                reason: 'Authorization header verified',
                newCookie: cookieResult.success ? cookieResult.cookie : null
            };
        }

        // Fall back to cookie verification

        if (this.#sessionCookie) {
            const cookieCheck = await this.#isCookieVerified();

            if (cookieCheck.found && cookieCheck.verified) {
                return {...returnObject, verified: true, reason: 'Session cookie verified'};

            } else if (cookieCheck.found && !cookieCheck.verified) {
                return {...returnObject, reason: 'Session cookie not verified' };

            } else {
                return {...returnObject, reason: 'Session cookie not found in database' };
            }

        }else {
            return {...returnObject, reason: 'No Authorization header or session cookie provided'};
        }
    }   
}
