const GetAPI = async () => {
  const res = await fetch(
    "https://www.gov.uk/api/content/government/collections/vat-notices-numerical-orders",
  );
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  const data = await res.json();
  return data;
};

const API = async () => {
  const data = await GetAPI();
  return (
    <div>
      <h1>VAT Notices Numerical Orders</h1>
      <ul>
        {data.results.map((item: any) => (
          <li key={item.base_path}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default API;
