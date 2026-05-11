import { useState } from "react";
import { createEmptyPalletSpec, createItem } from "./models/palletSpec";
import { materialOptions } from "./data/materialOptions";
import {
  constructionOptions,
  packagingOptions,
  crateTypeOptions,
} from "./data/buildOptions";
import "./App.css";

function App() {
  // State used to store specs of pallet
  const [spec, setSpec] = useState(createEmptyPalletSpec());

  // States used to store item item specs
  const [itemMaterial, setItemMaterial] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);


  // Updates pallet spec with updated value depending on field
  function updateField(field, value) {
    setSpec((currentSpec) => ({
      ...currentSpec,
      [field]: value,
    }));
  }


  // Toggles option of field inside of a field (e.g., currentSpec[section = construction][key = nails] = !false )
  function toggleNestedOption(section, key) {
    setSpec((currentSpec) => ({
      ...currentSpec,
      [section]: {
        ...currentSpec[section],
        [key]: !currentSpec[section][key],
      },
    }));
  }


  // Handler function that creates item using item spec state fields and adds it to current list
  function handleAddItem(event) {
    event.preventDefault();

    // If no item material is given, no name is given, or quantity is less than 1, just return
    if (!itemMaterial || !itemName.trim() || itemQuantity < 1) {
      return;
    }

    // Create a new item using item spec state fields
    const newItem = createItem({
      material: itemMaterial,
      name: itemName.trim(),
      quantity: itemQuantity,
    });

    // Use setSpec to update pallet specs so that newly created item gets added to its list
    setSpec((currentSpec) => ({
      ...currentSpec,
      items: [...currentSpec.items, newItem],
    }));

    // Set item spec state fields back to empty
    setItemMaterial("");
    setItemName("");
    setItemQuantity(1);
  }


  // Function to remove item from item list by using setSpec to update pallet specs
  function removeItem(itemId) {
    setSpec((currentSpec) => ({
      ...currentSpec,
      items: currentSpec.items.filter((item) => item.id !== itemId),
    }));
  }


  // Handler function to export pallet specs to pdf handler
  function handleExport() {
    console.log("Exporting spec:", spec);
    // Later: call generatePdf(spec)
  }

  // Component builder
  return (
    <main className="app-shell">
      <section className="form-card">
        <header className="page-header">
          <h1>Pallet / Crate SOP</h1>
          <p>Create a simple build sheet for the manufacturer.</p>
        </header>

        <section className="form-section">
          <label htmlFor="clientName">Client / Project</label>
          <input
            id="clientName"
            value={spec.clientName}
            onChange={(event) => updateField("clientName", event.target.value)}
            placeholder="Enter client or project name"
          />
        </section>

        <section className="form-section">
          <div className="section-header">
            <h2>Items</h2>
            <span>{spec.items.length} added</span>
          </div>

          <form className="item-entry-row" onSubmit={handleAddItem}>
            <select
              value={itemMaterial}
              onChange={(event) => setItemMaterial(event.target.value)}
            >
              <option value="">Material</option>
              {materialOptions.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>

            <input
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="Item name, ex: mirror, shelf"
            />

            <input
              type="number"
              min="1"
              value={itemQuantity}
              onChange={(event) => setItemQuantity(event.target.value)}
            />

            <button type="submit">Add Item</button>
          </form>

          <div className="item-list">
            {spec.items.length === 0 ? (
              <p className="empty-message">No items added yet.</p>
            ) : (
              spec.items.map((item) => (
                <div className="item-row" key={item.id}>
                  <span>
                    <strong>{item.quantity}x</strong> {item.material}{" "}
                    {item.name}
                  </span>

                  <button type="button" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="form-section">
          <h2>Construction</h2>

          <div className="option-grid">
            {constructionOptions.map((option) => (
              <label className="check-option" key={option.key}>
                <input
                  type="checkbox"
                  checked={spec.construction[option.key]}
                  onChange={() =>
                    toggleNestedOption("construction", option.key)
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Outer Packaging</h2>

          <div className="option-grid">
            {packagingOptions.map((option) => (
              <label className="check-option" key={option.key}>
                <input
                  type="checkbox"
                  checked={spec.outerPackaging[option.key]}
                  onChange={() =>
                    toggleNestedOption("outerPackaging", option.key)
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Crate Type</h2>

          <div className="radio-stack">
            {crateTypeOptions.map((crateType) => (
              <label key={crateType}>
                <input
                  type="radio"
                  name="crateType"
                  value={crateType}
                  checked={spec.crateType === crateType}
                  onChange={(event) =>
                    updateField("crateType", event.target.value)
                  }
                />
                {crateType}
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <label htmlFor="specialInstructions">Special Instructions</label>
          <textarea
            id="specialInstructions"
            value={spec.specialInstructions}
            onChange={(event) =>
              updateField("specialInstructions", event.target.value)
            }
            placeholder="Example: Please separate items individually."
          />
        </section>

        <button className="export-button" type="button" onClick={handleExport}>
          Export PDF
        </button>
      </section>
    </main>
  );
}

export default App;