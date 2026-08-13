import NavBar from "../../[username]/components/NavBar";
import { ProductsListClient } from "./ProductsListClient";

export default function ProductsDiscoverPage() {
  return (
    <>
      <NavBar title="Marketplace" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Items people are selling — recently listed first, or lowest price.
          </p>
        </div>
        <ProductsListClient />
      </main>
    </>
  );
}
