class Product {
    private String name;
    public String getName() { return name; }
    public static int count() { return name.length(); }
}
public class Main {
    static void show() { System.out.println("x"); }
    public static void main(String[] args) {
        int x = show();
        String s = System.out.println("a");
        String n = Product.getName();
        Product p = new Product("Apple");
    }
}
