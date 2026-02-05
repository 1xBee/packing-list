import supabase from "./supabase.js";

/**
 * Centralized API response handler
 * Handles authentication verification and provides consistent response patterns.
 * Logs all requests to Supabase for monitoring and debugging.
 */
export class ApiResponse {
    #req;
    #res;
    #onSuccess;
    #otherStatusCallback;
    
    // Logging fields - updated throughout the request lifecycle
    #path;
    #status_code;
    #error;
    #auth_message;
    #is_internal_error;

    /**
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} onSuccess - Callback when auth is verified (req, res, newCookie)
     * @param {Object|Function} [otherStatusCallback] - Optional mapping like { '401': fn, '500': fn }
     *                                                  or legacy function (treated as 401 handler)
     */
    constructor(req, res, onSuccess, otherStatusCallback) {
        if (!req || !res || typeof onSuccess !== 'function') {
            throw new Error('ApiResponse requires req, res, and an onSuccess callback');
        }
        this.#req = req;
        this.#res = res;
        this.#onSuccess = onSuccess;
        this.#otherStatusCallback = {};
        
        // Initialize logging fields with defaults
        this.#path = req.url || req.originalUrl || null;
        this.#status_code = null;
        this.#error = null;
        this.#auth_message = null;
        this.#is_internal_error = false;

        // Backwards compatibility: if a function is passed, treat it as 401 handler
        if (typeof otherStatusCallback === 'function') {
            this.#otherStatusCallback['401'] = otherStatusCallback;
        } else if (otherStatusCallback && typeof otherStatusCallback === 'object') {
            this.#otherStatusCallback = { ...otherStatusCallback };
        }
    }

    /**
     * Default 401 response - used when no custom handler provided
     */
    #default401response(err) {
        return this.#res.status(401).json({ error: err }).end();
    }

    /**
     * Default 500 response - used when no custom handler provided
     */
    #default500response(err) {
        return this.#res.status(500).json({ error: err }).end();
    }

    /**
     * Formats error for JSON storage in Supabase
     * - null/undefined -> null
     * - string -> { message: string }
     * - Error instance -> { message, stack }
     * - object -> passed through as-is
     */
    #formatError(error) {
        if (error === null || error === undefined) return null;
        if (typeof error === 'string') return { message: error };
        if (error instanceof Error) return { message: error.message, stack: error.stack };
        return error;
    }

    /**
     * Logs request to Supabase via direct fetch
     * Uses direct fetch instead of supabase-js client to avoid known deadlock bug
     * Fire-and-forget - errors logged to console but don't affect response
     */
    async #logToSupabase() {
        try {
            await fetch(`${process.env.supabase_url}/rest/v1/api_logs`, {
                method: 'POST',
                headers: {
                    'apikey': process.env.supabase_key,
                    'Authorization': `Bearer ${process.env.supabase_key}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    path: this.#path,
                    status_code: this.#status_code,
                    auth_message: this.#auth_message,
                    is_internal_error: this.#is_internal_error,
                    error_message: this.#formatError(this.#error)
                })
            });
        } catch (err) {
            console.error('Failed to log to Supabase:', err);
        }
    }

    /**
     * Main entry point - verifies auth and routes to appropriate handler
     * 
     * Flow:
     * 1. Verify authentication
     * 2. If verified -> call onSuccess, set status 200
     * 3. If not verified -> call 401 handler (custom or default)
     * 4. On exception -> call 500 handler (custom or default)
     * 5. Log to Supabase (fire-and-forget)
     * 6. Return result
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
                
                this.#status_code = 200;
                this.#auth_message = `Authenticated successfully ${authResult.newCookie ? 'new cookie created' : ''}`;
            } else {
                this.#status_code = 401;
                this.#auth_message = authResult.reason || 'Unauthorized';
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            
            this.#status_code = 500;
            this.#error = error;
            this.#is_internal_error = true;
        }

        // Log BEFORE sending response
        await this.#logToSupabase();

        const logData = {
            path: this.#path,
            status_code: this.#status_code,
            auth_message: this.#auth_message,
            is_internal_error: this.#is_internal_error,
            error: this.#error
        };

        console.log(logData);

        // NOW send the response
        if (this.#status_code === 200) {
            await this.#onSuccess(this.#req, this.#res);
        } else if (this.#status_code === 401) {
            const handler = this.#otherStatusCallback['401'];
            typeof handler === 'function'
                ? await handler(this.#req, this.#res, this.#auth_message)
                : this.#default401response(this.#auth_message);
        } else {
            const handler = this.#otherStatusCallback['500'];
            typeof handler === 'function'
                ? await handler(this.#req, this.#res, this.#error)
                : this.#default500response(this.#error);
        }

        return logData;
    }
}