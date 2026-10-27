import java.util.ArrayList;
import java.util.Scanner;

class Product {
    private String productId;
    private String productName;
    private int productPrice;
    private int productStock;

    public Product(String productId, String productName, int productPrice, int productStock) {
        this.productId = productId;
        this.productName = productName;
        this.productPrice = productPrice;
        this.productStock = productStock;
    }

    public String getProductId() { return productId; }
    public String getProductName() { return productName; }
    public int getProductPrice() { return productPrice; }
    public int getProductStock() { return productStock; }

    public int getTotalValue() {
        return productPrice * productStock;
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Product> products = new ArrayList<>();

        int n = Integer.parseInt(sc.nextLine().trim());
        for (int i = 0; i < n; i++) {
            String[] parts = sc.nextLine().split(";");
            products.add(new Product(parts[0], parts[1],
                    Integer.parseInt(parts[2]), Integer.parseInt(parts[3])));
        }

        int total = 0;
        for (Product p : products) {
            System.out.println(p.getProductId() + " | " + p.getProductName() + " | Rp " + p.getProductPrice()
                    + " x " + p.getProductStock() + " = Rp " + p.getTotalValue());
            total += p.getTotalValue();
        }
        System.out.println("Total inventory value: Rp " + total);
    }
}
