/* Endereço e chave PÚBLICA (anon/publishable) do Supabase.
   Nunca coloque aqui a chave service_role/secret. */
(function () {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  window.AULAS_CONFIG = local
    ? {
        /* Supabase local (npx supabase start): chave padrão de desenvolvimento. */
        supabaseUrl: "http://127.0.0.1:54321",
        supabaseKey: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
      }
    : {
        supabaseUrl: "https://cffdjjwysxpepmiuepnd.supabase.co",
        supabaseKey: "sb_publishable_3lyWrGvMwxIBMG_KQ8L85g_npKuh2wt"
      };
})();
