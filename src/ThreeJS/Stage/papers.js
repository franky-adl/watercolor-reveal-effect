// Paper presets. Each picks one of the procedural height fields in Shaders/Paper/field.frag (`kind`)
// and says how the sheet looks: its colour, inclusions, how strongly the relief is lit
// and how cloudy the fibre formation is.
//   kind:   which height field the paper shader builds
//   tint:   sheet colour (sRGB)
//   fleck:  colour of dark specks and inclusions (sRGB)
//   bump:   how strongly the relief is lit
//   mottle: cloudiness of the sheet, uneven fibre formation, felt marks

export const PAPERS = [
    {
        id: "cold",
        name: "Cold Press",
        hint: "Medium tooth, natural white: the all-round watercolour sheet",
        kind: 0,
        tint: "#fafcf3",
        fleck: "#8a8070",
        bump: 0.6,
        mottle: 0.0,
    },
    {
        id: "hot",
        name: "Hot Press",
        hint: "Pressed smooth and bright: crisp edges, little granulation",
        kind: 1,
        tint: "#f8f7f3",
        fleck: "#8a8478",
        bump: 0.6,
        mottle: 0.04,
    },
    {
        id: "rough",
        name: "Rough",
        hint: "Deep, knobbly tooth: dry brush breaks up, pigment pools in the hollows",
        kind: 2,
        tint: "#f5f1e8",
        fleck: "#857a68",
        bump: 0.8,
        mottle: 0.06,
    },
    {
        id: "khadi",
        name: "Khadi",
        hint: "Handmade cotton rag: lumpy, cream, with fibres and specks",
        kind: 3,
        tint: "#efe7d6",
        fleck: "#6d5f4a",
        bump: 1.0,
        mottle: 0.12,
    },
    {
        id: "washi",
        name: "Washi",
        hint: "Japanese kozo: smooth, cloudy, with long silky fibres",
        kind: 4,
        tint: "#f1ece0",
        fleck: "#7a6a52",
        bump: 0.8,
        mottle: 0.14,
    },
    {
        id: "laid",
        name: "Laid",
        hint: "Ingres-style laid lines with chain lines every inch",
        kind: 5,
        tint: "#f2ebdb",
        fleck: "#8a7c64",
        bump: 1.0,
        mottle: 0.05,
    },
    {
        id: "canvas",
        name: "Canvas",
        hint: "Primed cotton canvas board: a fine plain weave",
        kind: 6,
        tint: "#f3efe6",
        fleck: "#8a8070",
        bump: 1.0,
        mottle: 0.04,
    },
    {
        id: "toned",
        name: "Toned Sand",
        hint: "Mi-Teintes-style honeycomb tooth on a warm tan sheet",
        kind: 7,
        tint: "#d9c8a6",
        fleck: "#6e5f45",
        bump: 1.0,
        mottle: 0.06,
    },
    {
        id: "kraft",
        name: "Kraft",
        hint: "Recycled brown kraft: smooth, streaky, flecked",
        kind: 8,
        tint: "#b99872",
        fleck: "#4e3b28",
        bump: 0.8,
        mottle: 0.12,
    },
    {
        id: "cellulose",
        name: "Student",
        hint: "Wood-pulp student paper: a regular machine-pressed texture",
        kind: 9,
        tint: "#f7f7f4",
        fleck: "#8a8a84",
        bump: 1.0,
        mottle: 0.03,
    },
];

export const DEFAULT_PAPER = PAPERS[0];
