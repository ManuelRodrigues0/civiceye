export async function getAQI(lat, lng) {

  try {

    const token = "9dea756f7d653d064b7c68fb94046235078997ca";

    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "ok") {
      return {
        aqi: "No data",
        station: null
      };
    }

    return {
      aqi: data.data.aqi,
      station: data.data.city.name,
      dominant: data.data.dominentpol
    };

  } catch (err) {

    console.error(err);

    return {
      aqi: "Error",
      station: null
    };

  }

}