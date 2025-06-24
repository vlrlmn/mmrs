import Config from "../../../../config/Config";

export async function updateUMS(updates: Array<{ id: number; rating: number }>) {
  return await fetch(`http://${Config.getInstance().getUmsAddr()}/internal/rating/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
}
