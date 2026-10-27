// Java data structures: ArrayList, LinkedList (Queue), Stack, HashMap, HashSet
import java.util.*;

public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> list = new ArrayList<>(List.of(40, 10, 30, 20));
        list.add(1, 99);                 // insert at index 1
        list.remove(Integer.valueOf(99)); // remove by value
        list.remove(0);                  // remove by index
        Collections.sort(list);
        System.out.println("ArrayList: " + list + " size=" + list.size() + " get(0)=" + list.get(0));

        Queue<String> queue = new LinkedList<>();   // FIFO
        queue.offer("Andi"); queue.offer("Budi"); queue.offer("Citra");
        System.out.println("Queue poll: " + queue.poll() + ", left " + queue);

        Stack<String> stack = new Stack<>();        // LIFO
        stack.push("open"); stack.push("edit"); stack.push("save");
        System.out.println("Stack pop: " + stack.pop() + ", peek " + stack.peek() + ", " + stack);

        HashMap<String, Integer> stock = new HashMap<>();
        stock.put("apel", 10); stock.put("susu", 4); stock.put("apel", 12);   // same key -> replaced
        System.out.println("HashMap: " + stock + " apel=" + stock.get("apel") + " kiwi=" + stock.getOrDefault("kiwi", 0));
        for (Map.Entry<String, Integer> e : stock.entrySet()) System.out.println("  " + e.getKey() + " -> " + e.getValue());

        HashSet<String> set = new HashSet<>();
        System.out.println("HashSet add: " + set.add("x") + " " + set.add("x") + " size=" + set.size());

        // the classic mistake: removing inside for-each
        try {
            for (Integer x : list) if (x == 20) list.remove(x);
        } catch (ConcurrentModificationException e) {
            System.out.println("for-each + remove -> " + e);
        }
        list.removeIf(x -> x == 20);       // the right way
        System.out.println("after removeIf: " + list);
    }
}
