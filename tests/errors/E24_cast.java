class A {} class B {}
public class Main {
    public static void main(String[] args) {
        String s = "5";
        int x = (int) s;
        A a = new A();
        B b = (B) a;
        boolean t = (boolean) 1;
        Integer i = (Integer) s;
    }
}
