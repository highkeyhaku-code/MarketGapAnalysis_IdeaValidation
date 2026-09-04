import { supabaseAdmin } from "../lib/supabaseClient.ts";

async function debug() {
  const { data: ideas } = await supabaseAdmin.from("ideas").select("*").limit(5);
  console.log("Ideas in DB:", ideas);

  if (ideas && ideas.length > 0) {
    const testId = ideas[0].id;
    const { data: commits } = await supabaseAdmin.from("idea_commits").select("id, q4_supplementary_pains").eq("idea_id", testId);
    console.log("Commits for idea:", commits);
  }
}
debug();
