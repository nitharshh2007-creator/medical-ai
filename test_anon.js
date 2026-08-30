import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPermissions() {
  console.log("Testing SELECT...");
  const { data: selectData, error: selectError } = await supabase
    .from('students')
    .select('*')
    .limit(1);
    
  if (selectError) {
    console.error("SELECT Error:", selectError.message);
    process.exit(1);
  }
  console.log("SELECT success!", selectData);

  console.log("Testing INSERT...");
  const rollNumber = `TEST-${Date.now()}`;
  const { data: insertData, error: insertError } = await supabase
    .from('students')
    .insert({ name: 'Test User', roll_number: rollNumber })
    .select();
    
  if (insertError) {
    console.error("INSERT Error:", insertError.message);
    process.exit(1);
  }
  console.log("INSERT success!", insertData);
  
  console.log("All tests passed. The anon permissions are verified on the live database.");
}

testPermissions();
