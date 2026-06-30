// Script to deactivate staff products via Supabase Edge Function
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://aikqnvltuwwgifuocvto.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODc0NzQsImV4cCI6MjA3MTQ2MzQ3NH0.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8";

const supabase = createClient(supabaseUrl, supabaseKey);

const staffProductIds = [
  "prod_T1EDP2FMeiDz53", // Staff Professional Plan
  "prod_T1ED3wpRu9NwtC", // Staff Admin Plan
  "prod_T1EDNUbAVdy82A", // Staff Support Plan
  "prod_T1EDO0wamhZYNf", // Staff Developer Plan
  "prod_T1EDPwrATiKNw9", // Staff Management Plan
];

async function deactivateProducts() {
  console.log("Deactivating staff products...");

  for (const productId of staffProductIds) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "stripe-payment",
        {
          body: {
            product_id: productId,
            active: false,
          },
        },
      );

      if (error) {
        console.error(`Error deactivating ${productId}:`, error);
      } else {
        console.log(`✅ Deactivated ${productId}:`, data);
      }
    } catch (err) {
      console.error(`Exception deactivating ${productId}:`, err);
    }
  }

  console.log("Deactivation complete!");
}

deactivateProducts();
