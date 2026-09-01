import { supabaseAdmin } from "../lib/supabaseClient";

async function diagnose() {
  console.log("--- 1. Testing simple select on ideas ---");
  const res1 = await supabaseAdmin.from("ideas").select("id, title, created_at, user_id").limit(5);
  console.log("res1 (base columns):", res1.error ? `Error: ${res1.error.message}` : `Found ${res1.data?.length} records`, res1.data);

  console.log("\n--- 2. Testing select on ideas with active_commit_id ---");
  const res2 = await supabaseAdmin.from("ideas").select("id, title, active_commit_id, created_at, user_id").limit(5);
  console.log("res2 (with active_commit_id):", res2.error ? `Error: ${res2.error.message}` : `Success!`, res2.data);

  console.log("\n--- 3. Testing select on ideas with idea_commits relation ---");
  const res3 = await supabaseAdmin.from("ideas").select("id, title, created_at, user_id, idea_commits(*)").limit(5);
  console.log("res3 (with idea_commits relation):", res3.error ? `Error: ${res3.error.message}` : `Success! Data count: ${res3.data?.length}`);

  console.log("\n--- 4. Testing select on idea_commits directly ---");
  const res4 = await supabaseAdmin.from("idea_commits").select("id, idea_id, parent_commit_id, status, emotional_score, created_at").limit(5);
  console.log("res4 (idea_commits directly):", res4.error ? `Error: ${res4.error.message}` : `Found ${res4.data?.length} commits`, res4.data);
}

diagnose().catch(console.error);
