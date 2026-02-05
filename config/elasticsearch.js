import { Client } from '@elastic/elasticsearch';
import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    node: 'https://localhost:9200',
    auth: {
        username: process.env.elasticsearch_username,
        password: process.env.elasticsearch_password // use the password you reset
    },
    tls: {
        rejectUnauthorized: false // allows self-signed certificate (local dev only)
    }
});

if (!client) {
    console.error("Elasticsearch client initialization failed");
}
else {
    console.log("Elasticsearch client initialized successfully");
}

export default client;
