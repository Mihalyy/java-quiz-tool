import java.util.*;
public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> nums = new ArrayList<>(Arrays.asList(5, 3, 8, 1, 9, 2));
        nums.add(7); nums.add(0, 10); nums.remove(Integer.valueOf(8)); nums.remove(0);
        System.out.println(nums + " size=" + nums.size() + " get2=" + nums.get(2) + " idx9=" + nums.indexOf(9) + " has1=" + nums.contains(1));
        Collections.sort(nums); System.out.println(nums);
        nums.sort(Collections.reverseOrder()); System.out.println(nums);
        nums.removeIf(n -> n % 2 == 0); System.out.println(nums + " max=" + Collections.max(nums) + " min=" + Collections.min(nums));
        nums.set(0, 100); System.out.println(nums);
        List<String> names = new ArrayList<>(List.of("Charlie", "alice", "Bob", "dave"));
        names.sort(String.CASE_INSENSITIVE_ORDER); System.out.println(names);
        names.sort(Comparator.comparing(String::length).thenComparing(Comparator.reverseOrder())); System.out.println(names);
        Iterator<String> it = names.iterator();
        while (it.hasNext()) if (it.next().startsWith("B")) it.remove();
        System.out.println(names);
        try { for (String n : names) if (n.equals("alice")) names.remove(n); } catch (ConcurrentModificationException e) { System.out.println("CME " + e.getMessage()); }
        System.out.println(names);
        Map<String, Integer> stock = new HashMap<>();
        stock.put("apple", 10); stock.put("banana", 5); stock.put("cherry", 7); stock.put("date", 3); stock.put("elderberry", 1); stock.put("fig", 12);
        stock.put("apple", stock.get("apple") + 5);
        System.out.println(stock + " " + stock.size() + " " + stock.containsKey("fig") + " " + stock.getOrDefault("kiwi", 0));
        for (Map.Entry<String, Integer> e : stock.entrySet()) System.out.print(e.getKey() + "=" + e.getValue() + ";");
        System.out.println();
        for (String k : stock.keySet()) System.out.print(k + " ");
        System.out.println(stock.values());
        stock.remove("banana");
        Map<String, Integer> tm = new TreeMap<>(stock); System.out.println(tm);
        Map<String, Integer> lhm = new LinkedHashMap<>(); lhm.put("z", 1); lhm.put("a", 2); lhm.put("m", 3); System.out.println(lhm);
        Map<Integer, String> im = new HashMap<>(); for (int i = 20; i >= 0; i -= 3) im.put(i, "v" + i); System.out.println(im);
        Map<String, Integer> counts = new HashMap<>();
        for (String w : "the cat and the hat and the bat".split(" ")) counts.put(w, counts.getOrDefault(w, 0) + 1);
        System.out.println(counts);
        counts.merge("cat", 10, Integer::sum); counts.computeIfAbsent("dog", k -> 99); System.out.println(counts);
        Set<String> hs = new HashSet<>(Arrays.asList("pear", "apple", "kiwi", "banana", "apple"));
        System.out.println(hs + " " + hs.size());
        Set<Integer> ts = new TreeSet<>(List.of(5, 1, 9, 3)); System.out.println(ts);
        Stack<Integer> st = new Stack<>(); st.push(1); st.push(2); st.push(3);
        System.out.println(st + " pop=" + st.pop() + " peek=" + st.peek() + " " + st + " empty=" + st.isEmpty() + " search=" + st.search(1));
        Queue<String> q = new LinkedList<>(); q.offer("a"); q.offer("b"); q.add("c");
        System.out.println(q.poll() + " " + q.peek() + " " + q + " " + q.size());
        Deque<Integer> dq = new ArrayDeque<>(); dq.push(1); dq.push(2); dq.addLast(3); dq.offerFirst(0);
        System.out.println(dq + " " + dq.pop() + " " + dq.pollLast() + " " + dq);
        PriorityQueue<Integer> pq = new PriorityQueue<>(); for (int x : new int[]{5, 1, 8, 3, 2, 9}) pq.add(x);
        System.out.print(pq + " -> ");
        while (!pq.isEmpty()) System.out.print(pq.poll() + " ");
        System.out.println();
        PriorityQueue<String> pq2 = new PriorityQueue<>(Comparator.reverseOrder()); pq2.addAll(List.of("b", "d", "a", "c")); System.out.println(pq2 + " " + pq2.peek());
        LinkedList<Integer> ll = new LinkedList<>(); ll.add(1); ll.addFirst(0); ll.addLast(2); System.out.println(ll + " " + ll.getFirst() + " " + ll.getLast() + " " + ll.removeFirst() + " " + ll);
        List<Integer> fixed = Arrays.asList(1, 2, 3);
        try { fixed.add(4); } catch (UnsupportedOperationException e) { System.out.println("UOE " + e.getMessage()); }
        try { nums.get(99); } catch (IndexOutOfBoundsException e) { System.out.println(e.getMessage()); }
        List<Integer> empty = new ArrayList<>();
        System.out.println(empty.isEmpty() + " " + empty);
        ArrayList<Double> prices = new ArrayList<>(); prices.add(1.5); prices.add(2.0); double total = 0; for (double p : prices) total += p; System.out.println(total + " " + prices);
        List<int[]> pairs = new ArrayList<>(); pairs.add(new int[]{1, 2}); System.out.println(pairs.get(0)[1]);
        Map<String, List<String>> groups = new TreeMap<>();
        for (String w : List.of("apple", "avocado", "banana", "blueberry", "cherry")) groups.computeIfAbsent(w.substring(0, 1), k -> new ArrayList<>()).add(w);
        System.out.println(groups);
        System.out.println(Collections.frequency(List.of(1, 2, 1, 1), 1));
        List<String> rev = new ArrayList<>(List.of("a", "b", "c")); Collections.reverse(rev); System.out.println(rev);
        Collections.swap(rev, 0, 2); System.out.println(rev);
        names.forEach(n -> System.out.print(n.toUpperCase() + " ")); System.out.println();
        stock.forEach((k, v) -> System.out.print(k + "->" + v + " ")); System.out.println();
        List<Integer> copy = new ArrayList<>(nums); copy.clear(); System.out.println(copy.size() + " " + nums.size());
        Random rnd = new Random(42); System.out.println(rnd.nextInt(100) + " " + rnd.nextInt(100) + " " + rnd.nextDouble() + " " + rnd.nextBoolean() + " " + rnd.nextInt() + " " + rnd.nextInt(5, 10) + " " + rnd.nextLong());
        List<Integer> sh = new ArrayList<>(List.of(1,2,3,4,5,6)); Collections.shuffle(sh, new Random(7)); System.out.println(sh);
    }
}
