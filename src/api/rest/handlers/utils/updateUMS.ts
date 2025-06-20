import Config from "../../../../config/Config";

export async function updateUMS(updates: Array<{ id: number; rating: number }>) {
  try {
    const res = await fetch(`http://${Config.getInstance().getUmsAddr()}/internal/rating/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      console.error('UMS rating update failed:', res.status, await res.text());
    } else {
      console.log('UMS rating update succeeded');
    }
  } catch (error) {
    console.error('Failed to notify UMS:', error);
  }
}
