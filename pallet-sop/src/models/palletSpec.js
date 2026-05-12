/// Creates and returns object with specs of a pallet being empty
export function createEmptyPalletSpec() {
    return {
        clientName: "",

        items: [],

        construction: {
            nails: false,
            screws: false,
            staples: false,
            glue: false,
        },

        outerPackaging: {
            shrinkWrap: false,
            straps: false,
            foamPadding: false,
        },

        crateType: "",
    };
}

/// Creates and returns an object that represents an item being stored inside of the pallet
export function createItem({ material, name }) {
    return {
        id: crypto.randomUUID(),
        material,
        name,
    };
}