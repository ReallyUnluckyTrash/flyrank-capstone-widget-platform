import { isIP } from 'node:net';

function getClientIp(request) {
	return (request.ip || request.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

function isPrivateIp(ip) {
	if (isIP(ip) === 6) {
		return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:');
	}

	if (isIP(ip) !== 4) return true;
	const octets = ip.split('.').map(Number);
	return octets[0] === 10
		|| (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
		|| (octets[0] === 192 && octets[1] === 168)
		|| octets[0] === 127
		|| (octets[0] === 169 && octets[1] === 254);
}

async function fetchJson(url) {
	const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
	if (!response.ok) throw new Error(`Geo provider returned ${response.status}`);
	return response.json();
}

export async function enrichIp(request) {
	const ip = getClientIp(request);
	if (!ip || isPrivateIp(ip)) return { ipAddress: ip || null, country: null, city: null };

	try {
		const data = await fetchJson(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`);
		if (data.status === 'success') {
			return { ipAddress: ip, country: data.country ?? null, city: data.city ?? null };
		}
	} catch (error) {
		console.warn('Primary geo provider failed:', error.message);
	}

	try {
		const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
		return { ipAddress: ip, country: data.country_name ?? null, city: data.city ?? null };
	} catch (error) {
		console.warn('Fallback geo provider failed:', error.message);
		return { ipAddress: ip, country: null, city: null };
	}
}
