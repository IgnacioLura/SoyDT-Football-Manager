#include <stdio.h>

typedef struct GameHandle GameHandle;

extern GameHandle *engine_create_scoped_game(const char *);
extern void engine_free_game(GameHandle *);
extern char *engine_get_snapshot(GameHandle *);
extern char *engine_process_days(GameHandle *, unsigned int);
extern void free_string(char *);

int main(void) {
    GameHandle *g = engine_create_scoped_game("[\"AR\",\"UY\",\"BR\"]");
    if (!g) {
        printf("engine_create_scoped_game returned null\n");
        return 1;
    }
    printf("scoped game created\n");

    char *snap = engine_get_snapshot(g);
    printf("scoped snapshot: %s\n", snap);
    free_string(snap);

    char *proc = engine_process_days(g, 1);
    printf("scoped process_days(1): %s\n", proc);
    free_string(proc);

    engine_free_game(g);
    return 0;
}
