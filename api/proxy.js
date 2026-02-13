import fetch from 'node-fetch';

export default async function handler(request, response) {
    const targetHost = "web-api.tp.entsoe.eu";
    const apiKey = process.env.VITE_ENTSOE_API_KEY;

    // construct query string
    const url = new URL(request.url, `http://${request.headers.host}`);
    const queryParams = url.searchParams;

    // Ensure API Key is present
    if (!queryParams.has('securityToken') && apiKey) {
        queryParams.append('securityToken', apiKey);
    }

    const targetUrl = `https://${targetHost}/api?${queryParams.toString()}`;

    console.log(`Proxying to: ${targetUrl}`);

    try {
        const apiRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "User-Agent": "El-Karta-Europa/1.0",
                "Content-Type": "application/xml"
            }
        });

        const text = await apiRes.text();

        response.status(apiRes.status);
        response.setHeader("Content-Type", "application/xml");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.send(text);

    } catch (error) {
        console.error("Proxy Failed", error);
        response.status(500).send(`Proxy Error: ${error.message}`);
    }
}
