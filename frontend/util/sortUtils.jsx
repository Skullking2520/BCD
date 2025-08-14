export function sortByColumn(data, columnIndex, order = "asc") {
  if (!data || data.length < 2) return data;

  const header = data[0];
  const rows = data.slice(1);

  const sortedRows = [...rows].sort((a, b) => {
    const valA = a[columnIndex];
    const valB = b[columnIndex];

    const isNumber = !isNaN(valA) && !isNaN(valB);
    if (isNumber) {
      return order === "asc" ? valA - valB : valB - valA;
    } else {
      return order === "asc"
        ? String(valA).localeCompare(valB)
        : String(valB).localeCompare(valA);
    }
  });

  return [header, ...sortedRows];
}
