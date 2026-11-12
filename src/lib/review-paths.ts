import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function revalidateReviewPaths(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { vendorId: true },
  });
  revalidatePath(`/product/${productId}`);
  revalidatePath("/products");
  revalidatePath("/");
  if (product?.vendorId) revalidatePath(`/vendor/${product.vendorId}`);
}
