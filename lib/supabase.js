import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.supabase_url;
const supabaseKey = process.env.supabase_key;
let client;
try{
    client = createClient(supabaseUrl, supabaseKey);
}catch(error){
    console.log('error with supa db init' + error)
}

export default client;