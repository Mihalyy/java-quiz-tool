import java.util.*;
class P {
    private String cat;
    private String code = "X1";
    P(String cat) { this.cat = cat; }
    String getCat() { return cat; }
    String getCode() { return code; }
}
public class Main {
    static final String FOOD = "Food";
    static String pick(boolean b) { return b ? "Food" : "Drink"; }
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String in = sc.nextLine();
        String lit = "Food";
        String lit2 = "Food";
        String same = in;
        System.out.println((in == "Food") + " " + (in != "Food") + " " + in.equals("Food"));
        System.out.println((lit == lit2) + " " + (lit == FOOD) + " " + (same == in) + " " + (lit == "Fo" + "od"));
        String built = "Fo";
        built += "od";
        System.out.println((built == lit) + " " + built.equals(lit) + " " + (built.intern() == lit));
        P p1 = new P("Food"), p2 = new P(in);
        System.out.println((p1.getCat() == "Food") + " " + (p2.getCat() == "Food") + " " + (p2.getCat() == in) + " " + (p1.getCode() == "X1"));
        System.out.println((pick(true) == "Food") + " " + (in.trim() == in) + " " + (in.toUpperCase() == in) + " " + (in.substring(1) == "ood"));
        String t = sc.next();
        String u = sc.next();
        System.out.println((t == u) + " " + t.equals(u) + " " + (String.valueOf(t) == t) + " " + (new String("Food") == "Food"));
        String choice;
        int loops = 0;
        do {
            choice = sc.nextLine().trim();
            loops++;
        } while (choice != "Y" && loops < 3);
        System.out.println("loops=" + loops);
        List<String> l = new ArrayList<>(); l.add("Food");
        System.out.println(l.get(0).equals(lit) + " " + (switchTest(in)));
    }
    static int switchTest(String s) { switch (s) { case "Food": return 1; default: return 0; } }
}
