// Demo competitor set. The pricing pages are scraped live by Bright Data;
// the UI shows logos rather than raw URLs.
export interface Competitor {
  name: string;
  domain: string;
  url: string;
  logo: string;
}

export const COMPETITORS: Competitor[] = [
  { name: "Linear", domain: "linear.app", url: "https://linear.app/pricing", logo: "/logos/linear.png" },
  { name: "Asana", domain: "asana.com", url: "https://asana.com/pricing", logo: "/logos/asana.png" },
  { name: "ClickUp", domain: "clickup.com", url: "https://clickup.com/pricing", logo: "/logos/clickup.png" },
];
