import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;
import java.util.TreeMap;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        HashMap<String, Integer> sold = new HashMap<>();

        while (true) {
            String name = sc.next();
            if (name.equals("END")) break;
            int qty = sc.nextInt();
            sold.put(name, sold.getOrDefault(name, 0) + qty);
        }

        if (sold.isEmpty()) {
            System.out.println("No sales today");
            return;
        }

        TreeMap<String, Integer> sorted = new TreeMap<>(sold);
        String best = null;
        for (Map.Entry<String, Integer> e : sorted.entrySet()) {
            System.out.println(e.getKey() + ": " + e.getValue());
            if (best == null || e.getValue() > sorted.get(best)) {
                best = e.getKey();
            }
        }
        System.out.println("Products sold: " + sold.size());
        System.out.println("Best seller: " + best + " (" + sold.get(best) + " pcs)");
    }
}
