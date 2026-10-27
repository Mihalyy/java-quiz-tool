class Product {
    private String name;
    private int price;
    public Product(String name, int price) { this.name = name; this.price = price; }
    private void secret() {}
}
public class Main {
    public static void main(String[] args) {
        Product p = new Product("Apple", 5000);
        System.out.println(p.name);
        p.price = 10;
        p.secret();
    }
}
