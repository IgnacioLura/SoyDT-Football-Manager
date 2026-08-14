#include <stdio.h>

typedef struct GameHandle GameHandle;

extern unsigned int engine_ffi_contract_version(void);
extern GameHandle *engine_create_game(void);
extern void engine_free_game(GameHandle *);
extern char *engine_get_snapshot(GameHandle *);
extern char *engine_process_days(GameHandle *, unsigned int);
extern char *engine_simulate_spike_match(const char *, const char *);
extern void free_string(char *);

int main(void) {
    printf("contract_version=%u\n", engine_ffi_contract_version());

    GameHandle *g = engine_create_game();
    if (!g) {
        printf("engine_create_game returned null\n");
        return 1;
    }
    printf("game created\n");

    char *snap = engine_get_snapshot(g);
    printf("snapshot (first 300 chars): %.300s\n", snap);
    free_string(snap);

    char *proc = engine_process_days(g, 1);
    printf("process_days(1): %s\n", proc);
    free_string(proc);

    char *snap2 = engine_get_snapshot(g);
    printf("snapshot after 1 day (first 300 chars): %.300s\n", snap2);
    free_string(snap2);

    engine_free_game(g);

    char *m = engine_simulate_spike_match("Nacional", "Penarol");
    printf("spike match: %s\n", m);
    free_string(m);

    return 0;
}
