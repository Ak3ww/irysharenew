// iryshare/src/utils/irysGraphql.ts
const IRYS_GRAPHQL_ENDPOINT = "https://uploader.irys.xyz/graphql";
export type IrysTag = { name: string; values: string[] };
export type IrysQueryOptions = {
  owners?: string[];
  tags?: IrysTag[];
  ids?: string[];
  limit?: number;
  order?: "ASC" | "DESC";
  after?: string;
};
export type IrysTransactionNode = {
  id: string;
  address: string;
  timestamp: number;
  tags: { name: string; value: string }[];
};
export type IrysQueryResult = {
  edges: { node: IrysTransactionNode; cursor: string }[];
};
export async function queryIrysTransactions(options: IrysQueryOptions): Promise<IrysQueryResult> {
  // Build GraphQL query string
  const query = `
    query IrysTxs($owners: [String!], $tags: [TagFilter!], $ids: [String!], $limit: Int, $order: Order, $after: String) {
      transactions(owners: $owners, tags: $tags, ids: $ids, limit: $limit, order: $order, after: $after) {
        edges {
          node {
            id
            address
            timestamp
            tags { name value }
          }
          cursor
        }
      }
    }
  `;
  const variables: any = {
    owners: options.owners,
    tags: options.tags,
    ids: options.ids,
    limit: options.limit,
    order: options.order,
    after: options.after,
  };
  // Remove undefined
  Object.keys(variables).forEach((k) => variables[k] === undefined && delete variables[k]);
  const res = await fetch(IRYS_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error("Failed to query Irys GraphQL");
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "Irys GraphQL error");
  return json.data.transactions;
}
export async function getIrysTransactionById(id: string) {
  const query = `
    query GetTx($ids: [String!]) {
      transactions(ids: $ids) {
        edges {
          node {
            id
            address
            timestamp
            tags { name value }
          }
        }
      }
    }
  `;
  const variables = { ids: [id] };
  const res = await fetch(IRYS_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error("Failed to query Irys GraphQL");
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "Irys GraphQL error");
  const edges = json.data.transactions.edges;
  return edges.length > 0 ? edges[0].node : null;
} 
