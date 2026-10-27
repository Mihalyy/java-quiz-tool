import java.util.ArrayList;
import java.util.HashMap;
class Product { String name; Product(String n) { name = n; } }
public class Main {
    public static void main(String[] args) {
        ArrayList<Product> list = new ArrayList<>();
        list.add("Apple");
        list.add(new Product());
        Product p = list.get("0");
        String s = list.get(0);
        HashMap<String, Integer> m = new HashMap<>();
        int v = m.get(1);
        ArrayList<int> bad = new ArrayList<>();
    }
}
