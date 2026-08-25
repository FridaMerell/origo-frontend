import { cache } from "react"
import { buildCookieHeader, fetchOrigoApi } from "./api-client"
import { getSessionCookies } from "./session"
import { FLUX_ENDPOINTS } from "./config"
import { Facility } from "./dal"

export const getWeather = cache(async (facility: Facility) => {
  let url = `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/${facility.lng}/lat/${facility.lat}/data.json`;
 
  const response = await fetch(url);
  if (!response.ok) return null;

  return response.json();
});