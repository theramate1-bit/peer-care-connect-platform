export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
  },
  from: () => ({ select: () => ({ data: [], error: null }) }),
};
