import { NextRequest, NextResponse } from 'next/server';
import { searchProductsByBrand } from '@/lib/nutrition/openfoodfacts';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await searchProductsByBrand(query, 30);
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
