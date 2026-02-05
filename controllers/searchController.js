import client from "../config/elasticsearch.js";

async function searchDocs(req, res) {
    try {
        const { query } = req.body;
        const result = await client.search({
            index: "documents",
            query: {
                multi_match: {
                    query: query,
                    fields: ["title", "content", "tags"],
                    fuzziness: "AUTO"
                }
            }
        });
        const results = result.hits.hits;
        res.status(200).json({ results });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// {
//   match_phrase_prefix: {
//     title: {
//       query: q
//     }
//   }
// }



// index: "documents",
//     suggest: {
//       title_suggest: {
//         prefix: q,
//         completion: {
//           field: "title.suggest"
//         }
//       }
//     }
export default searchDocs;