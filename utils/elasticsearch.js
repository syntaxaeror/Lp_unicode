import client from "config/elasticsearch.js";

async function createIndex(indexName) {
    const result = await client.indices.create({
        index: indexName,
    });
    console.log('Index created:', result);
}

