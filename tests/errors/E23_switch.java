public class Main {
    public static void main(String[] args) {
        int x = 3;
        switch (x) { case 1: break; case 1: break; }
        String s = "a";
        switch (s) { case 1: break; }
        double d = 1.0;
        switch (d) { case 1: break; }
        String r = switch (x) { case 1 -> "a"; };
    }
}
