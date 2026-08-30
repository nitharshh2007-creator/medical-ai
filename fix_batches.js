import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBatches() {
  const { data, error } = await supabase
    .from('students')
    .update({ batch: 'BATCH 1' })
    .is('batch', null);
    
  console.log('Fixed existing students:', error ? error.message : 'Success!');
}

fixBatches();
