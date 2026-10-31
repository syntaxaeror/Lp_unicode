import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
dotenv.config();

export function getElasticsearchOptions(env = process.env) {
    const username = env.ELASTICSEARCH_USERNAME ?? env.elasticsearch_username;
    const password = env.ELASTICSEARCH_PASSWORD ?? env.elasticsearch_password;

    if (Boolean(username) !== Boolean(password)) {
        throw new Error('Elasticsearch authentication requires both username and password');
    }

    const node = env.ELASTICSEARCH_URL ?? env.elasticsearch_url
        ?? (username ? 'https://localhost:9200' : 'http://localhost:9200');
    const options = { node };

    if (username && password) {
        options.auth = { username, password };
    }

    // Preserve support for local Docker's self-signed certificate only in development.
    const url = new URL(node);
    if (url.protocol === 'https:' && env.NODE_ENV !== 'production'
        && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        options.tls = { rejectUnauthorized: false };
    }

    return options;
}

const client = new Client(getElasticsearchOptions());

export default client;
