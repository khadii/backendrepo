
// import { createClient } from '@supabase/supabase-js'

// // const supabaseUrl = process.env.REACT_APP_URL
// const supabaseKey = process.env.REACT_APP_ANON_KEY
// export const  supabase = createClient(supabaseUrl, supabaseKey)


// supabaseClient.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_URL
const supabaseAnonKey = process.env.REACT_APP_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabase };
