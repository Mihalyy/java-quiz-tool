import java.util.*;
public class Main {
    interface Op { int apply(int a, int b); }
    public static void main(String[] args) {
        Op add = (a, b) -> a + b;
        System.out.println(add.apply(1));
        List<String> xs = new ArrayList<>();
        xs.forEach(x -> System.out.println(y));
        xs.sort((p, q) -> p.length() - q.lengthh());
    }
}
