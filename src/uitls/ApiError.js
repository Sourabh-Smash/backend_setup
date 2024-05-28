class ApiError extends Error{
    constructor(statusCode, message = "Something went wrong", errors = [], statch = "") {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.errors = errors
        this.success=false
        
        if (statch) {
            this.stack = statch
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
export { ApiError };