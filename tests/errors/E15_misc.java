import java.util.*;
public class Main {
    static void m(int a, String b) { }
    public static void main(String[] args) {
        m(1);
        m("x", 1);
        m(1, "x", 2);
        int x = 1;
        int x = 2;
        for (int i = 0; i < 3; i++) { int i = 5; }
        break;
        ArrayList<Integer> nums = new ArrayList<>();
        nums.add("five");
        String t = nums.get(0);
        Map<String, Integer> map = new HashMap<>();
        map.put(1, "a");
        Object o = new Object();
        String str = o;
        Integer boxed = 5.0;
        List<int> bad;
    }
}
