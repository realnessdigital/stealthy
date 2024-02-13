import http2 from 'http2-wrapper';
import decompressResponse from 'decompress-response-browserify';
import { HeaderGenerator } from 'header-generator';
import URL from 'url-parse';
import { stringify as queryStringify } from 'qs';



const headerGenerator = new HeaderGenerator();
const generateHeaders = () => ({
	...headerGenerator.getHeaders({ httpVersion: "2", operatingSystems: ["windows"]  }),
	...{
		'Upgrade-Insecure-Requests': "1"
	}
});

const toPascalCase = (header) => header.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase()).join('-');


export const get = (url, options = {}) => request(url, options)
export const post = (url, options = {}) => request(url, {...options, method: 'POST'})

export const request = (url, options = {}) => new Promise((resolve, reject) => {
	url = new URL(url);

	let headers = generateHeaders();

	options.requestBody = (['undefined', 'string'].includes(typeof options.data))? options.data || "" : JSON.stringify(options.data);
	if(options.requestBody.length > 0){
		headers['Content-Type'] = "application/json";
		headers['Content-Length'] = String(options.requestBody.length);
	}

	headers = {...headers, ...options.headers};
	for(const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase().startsWith('x-')) {
			headers[key] = value;
		} else {
			delete headers[key];
			headers[toPascalCase(key)] = value;
		}
	}
	options.headers = headerGenerator.orderHeaders(headers);

	const request = http2.request({

		hostname: url.hostname,
		protocol: url.protocol,
		path: `${url.pathname}${(options.params)? queryStringify(options.params) : url.query}`,
		method: 'GET',
		...options

	}, (response) => {
		let body = "";

		console.log(response.responseCode)

		response = decompressResponse(response);
		response.on('data', chunk => body += chunk);
		response.on('end', () => {
			response.body = body;

			try{
				response.data = JSON.parse(body);
			} catch (error){
				response.data = null;
			}

			resolve(response);
		});
	});

	request.on('error', (error) => reject(error));

	if(options.requestBody.length > 0){
		request.write(options.requestBody);
	}

	request.end();
});