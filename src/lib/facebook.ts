export const FB_SCOPES = [
    "ads_management",
    "ads_read",
    "business_management"
].join(",");

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Facebook configuration missing: ${name}`);
    }
    return value;
}

export function getFacebookLoginUrl(state: string) {
    const appId = requireEnv("FACEBOOK_APP_ID");
    const redirectUri = requireEnv("FACEBOOK_REDIRECT_URI");

    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${FB_SCOPES}&response_type=code&state=${encodeURIComponent(state)}`;
}

export async function exchangeCodeForToken(code: string) {
    const appId = requireEnv("FACEBOOK_APP_ID");
    const appSecret = requireEnv("FACEBOOK_APP_SECRET");
    const redirectUri = requireEnv("FACEBOOK_REDIRECT_URI");

    const response = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to exchange code for token");
    }

    return await response.json();
}

export async function getLongLivedToken(shortLivedToken: string) {
    const appId = requireEnv("FACEBOOK_APP_ID");
    const appSecret = requireEnv("FACEBOOK_APP_SECRET");

    const response = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to get long-lived token");
    }

    return await response.json();
}
