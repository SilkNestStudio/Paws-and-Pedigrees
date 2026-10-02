"""Panel list for render_sheet.py -- person."""

BASE = {'Body', 'Shirt', 'Jacket', 'Trousers', 'Boots', 'Hair_Short', 'Eyes', 'EyeShine', 'Brows', 'Mouth'}
DEFAULT = {'Skin': (0.62, 0.38, 0.27), 'Hair': (0.10, 0.055, 0.03), 'Jacket': (0.075, 0.105, 0.06),
           'Shirt': (0.50, 0.58, 0.68), 'Trousers': (0.26, 0.20, 0.13), 'Boots': (0.11, 0.065, 0.035),
           'Cap': (0.24, 0.20, 0.14), 'CoatLong': (0.86, 0.86, 0.83)}
KEEPER = dict(DEFAULT, Jacket=(0.045, 0.075, 0.04), Cap=(0.20, 0.15, 0.09))
MARA = dict(DEFAULT, Skin=(0.66, 0.44, 0.33), Hair=(0.30, 0.30, 0.31), Jacket=(0.06, 0.15, 0.36),
            Shirt=(0.70, 0.70, 0.66), Trousers=(0.12, 0.12, 0.13))
RIVAL = dict(DEFAULT, Skin=(0.36, 0.20, 0.12), Hair=(0.02, 0.015, 0.012), Jacket=(0.018, 0.03, 0.085),
             Shirt=(0.85, 0.85, 0.85), Trousers=(0.05, 0.05, 0.06), Boots=(0.02, 0.015, 0.012))


def panels(meshes, set_colors):
    T = (0, 0, 0.88)
    SC = 2.05
    cap = (BASE - {'Hair_Short'}) | {'Cap_Flat', 'Hair_Short'}
    mara = (BASE - {'Hair_Short'}) | {'Hair_Long'}
    coat = BASE | {'Coat_Long'}
    out = [
        ('front', None, 1, BASE, {}, 'front', T, SC),
        ('side', None, 1, BASE, {}, 'side', T, SC),
        ('3/4', None, 1, BASE, {}, 'q34', T, SC),
        ('head', None, 1, BASE, {}, 'head', (0, 0, 1.57), 0.55),
        ('Idle', 'Idle', 30, BASE, {}, 'q34', T, SC),
        ('Walk', 'Walk', 8, BASE, {}, 'side', T, SC),
        ('Run', 'Run', 5, BASE, {}, 'side', T, SC),
        ('Whistle', 'Whistle', 15, BASE, {}, 'q34', T, SC),
        ('CastLeft', 'CastLeft', 20, BASE, {}, 'front', T, SC),
        ('CastBack', 'CastBack', 20, BASE, {}, 'q34', T, SC),
        ('Send', 'Send', 17, BASE, {}, 'side', T, SC),
        ('Throw (wind-up)', 'Throw', 11, BASE, {}, 'q34', T, SC),
        ('Throw (release)', 'Throw', 18, BASE, {}, 'q34', T, SC),
        ('Call', 'Call', 5, BASE, {}, 'q34', T, SC),
        ('Kneel', 'Kneel', 1, BASE, {}, 'q34r', T, SC),
        ('Point', 'Point', 20, BASE, {}, 'q34', T, SC),
        ('Wave', 'Wave', 4, BASE, {}, 'q34', T, SC),
        ('Talk', 'Talk', 20, BASE, {}, 'q34', T, SC),
        ('Clap', 'Clap', 6, BASE, {}, 'front', T, SC),
        ('keeper: waxed jacket + flat cap', None, 1, cap, {}, 'q34', T, SC, KEEPER),
        ('Mara: grey hair tied back, fleece', None, 1, mara, {}, 'q34r', T, SC, MARA),
        ('Mara back', None, 1, mara, {}, 'back34', T, SC, MARA),
        ('rival: navy jacket', None, 1, BASE, {}, 'q34', T, SC, RIVAL),
        ('helper coat (Coat_Long) walking', 'Walk', 8, coat, {}, 'q34', T, SC),
        ('keeper head', None, 1, cap, {}, 'head', (0, 0, 1.57), 0.6, KEEPER),
        ('Mara head', None, 1, mara, {}, 'q34r', (0, 0, 1.55), 0.6, MARA),
        ('rival head', None, 1, BASE, {}, 'head', (0, 0, 1.57), 0.6, RIVAL),
        ('hands (Clap side)', 'Clap', 0, BASE, {}, 'side', (0, 0, 1.1), 0.9),
    ]
    return out
