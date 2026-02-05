import client from "../config/elasticsearch.js";

async function createIndex() {
    const result = await client.indices.create({
        index: "documents",
        mappings: {
            properties: {
                title: {
                    type: "text",
                    analyzer: "standard",
                    fields: {
                        keyword: { type: "keyword" },
                        suggest: { type: "completion" }  // autocomplete
                    }
                },
                content: { type: "text" },
                tags: { type: "keyword" },
                comments: { type: "text" },  // searchable comments
                authorId: { type: "keyword" },
                createdAt: { type: "date" }
            }
        }
    });
    console.log('Index created:', result);
}

createIndex().catch(console.error);
