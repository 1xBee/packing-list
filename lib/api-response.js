import supabase from "./supabase.js";

/**
 * Centralized API response handler
 * Supports an onSuccess callback and an optional mapping of status-code callbacks.
 */
export class ApiResponse {
    #req;
    #res;
    #onSuccess;
    #otherStatusCallback;

    /**
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} onSuccess - Callback when auth is verified (req, res, newCookie)
     * @param {Object|Function} [otherStatusCallback] - Optional mapping like { '401': fn, '500': fn } or legacy onError function (treated as 401 handler)
     */
    constructor(req, res, onSuccess, otherStatusCallback) {
        if (!req || !res || typeof onSuccess !== 'function') {
            throw new Error('ApiResponse requires req, res and an onSuccess callback');
        }
        this.#req = req;
        this.#res = res;
        this.#onSuccess = onSuccess;
        this.#otherStatusCallback = {};

        // Backwards compatibility: if a function is provided as fourth arg, treat it as 401 handler
        if (typeof otherStatusCallback === 'function') {
            this.#otherStatusCallback['401'] = otherStatusCallback;
        } else if (otherStatusCallback && typeof otherStatusCallback === 'object') {
            this.#otherStatusCallback = { ...otherStatusCallback };
        }
    }

    #default401response(err) {
        return this.#res.status(401).json({ error: err }).end();
    }

    #default500response(err) {
        return this.#res.status(500).json({ error: err }).end();
    }

    /**
     * Verify authorization and handle response
     * If verified -> call onSuccess
     * If not verified -> call provided 401 handler or default
     * On exception -> call provided 500 handler or default
     */
    async send() {
        const { Auth } = await import('./auth.js');

        try {
            const auth = new Auth(this.#req);
            const authResult = await auth.isVerified();

            if (authResult.verified) {
                if (authResult.newCookie) {
                    const setCookie = `__Host-session=${authResult.newCookie}; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; Secure; Path=/`;
                    this.#res.setHeader('Set-Cookie', setCookie);
                }
                return await this.#onSuccess(this.#req, this.#res, authResult.newCookie);
            } else {
                const handler = this.#otherStatusCallback['401'];
                if (typeof handler === 'function') {
                    return handler(this.#res, authResult.reason);
                }
                return this.#default401response(authResult.reason || 'Unauthorized');
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            const handler = this.#otherStatusCallback['500'];
            if (typeof handler === 'function') {
                return handler(this.#res, error);
            }
            return this.#default500response(error);
        }
    }
}
