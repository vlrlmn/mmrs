
class JwtError extends Error {
    constructor(origin: string, messageDetail: string) {
        super(`${origin} : ${messageDetail}`); // Sets the full message
        this.name = 'JwtError'; // Keep the class name as the error name
        // Ensure prototype chain is maintained
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

const JwtGeneratorConfigError = new JwtError("JwtGeneratorConfigError", "invalid argumnets");
const JwtSignError = new JwtError("JwtSignError", "token signing failed");
const JwtCachError = new JwtError("JwtCachError", "token caching failed");
const JwtExtractionError = new JwtError("JwtExtractionError", "token extraction from request failed");
const JwtTokenVerificationError = new JwtError("JwtTokenVerificationError", "token is not verified");

export {
    JwtGeneratorConfigError,
    JwtSignError,
    JwtCachError,
    JwtTokenVerificationError,
    JwtExtractionError
}