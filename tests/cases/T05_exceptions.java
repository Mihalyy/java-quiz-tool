import java.util.*;
class InsufficientStockException extends Exception {
    private int requested;
    public InsufficientStockException(String msg, int requested) { super(msg); this.requested = requested; }
    public int getRequested() { return requested; }
}
class Validator {
    static void check(int age) { if (age < 0) throw new IllegalArgumentException("Age cannot be negative: " + age); }
}
public class Main {
    static int depth = 0;
    static void recurse() { depth++; recurse(); }
    static void buy(int stock, int qty) throws InsufficientStockException {
        if (qty > stock) throw new InsufficientStockException("Not enough stock", qty);
        System.out.println("Bought " + qty);
    }
    static int tryFinally() { try { return 1; } finally { System.out.println("finally runs"); } }
    public static void main(String[] args) {
        try { int x = 10 / 0; } catch (ArithmeticException e) { System.out.println("Caught: " + e.getMessage() + " | " + e); }
        try { int[] a = new int[3]; a[3] = 1; } catch (ArrayIndexOutOfBoundsException e) { System.out.println(e.getMessage()); }
        try { String s = null; s.length(); } catch (NullPointerException e) { System.out.println("NPE caught"); }
        try { Integer.parseInt("12a"); } catch (NumberFormatException e) { System.out.println(e.getMessage() + " | " + e); }
        try { Integer.parseInt(""); } catch (NumberFormatException e) { System.out.println(e.getMessage()); }
        try { Double.parseDouble("x1"); } catch (NumberFormatException e) { System.out.println(e.getMessage()); }
        try { Object o = "str"; Integer i = (Integer) o; } catch (ClassCastException e) { System.out.println("CCE"); }
        try { buy(5, 3); buy(5, 10); } catch (InsufficientStockException e) { System.out.println(e.getMessage() + " req=" + e.getRequested() + " " + e); }
        try { Validator.check(-5); } catch (IllegalArgumentException | NullPointerException e) { System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage()); }
        finally { System.out.println("cleanup"); }
        System.out.println(tryFinally());
        try { recurse(); } catch (StackOverflowError e) { System.out.println("SO caught " + (depth > 500)); }
        try { throw new RuntimeException("outer", new IllegalStateException("inner")); } catch (RuntimeException e) { System.out.println(e.getMessage() + " cause=" + e.getCause().getMessage()); }
        try { "abc".substring(5); } catch (StringIndexOutOfBoundsException e) { System.out.println(e.getMessage()); }
        try { "abc".charAt(10); } catch (StringIndexOutOfBoundsException e) { System.out.println(e.getMessage()); }
        try { new ArrayList<Integer>().get(0); } catch (Exception e) { System.out.println(e); }
        try { List.of(1).add(2); } catch (UnsupportedOperationException e) { System.out.println(e); }
        try { new Scanner("abc").nextInt(); } catch (InputMismatchException e) { System.out.println(e); }
        try { Iterator<Integer> it = new ArrayList<Integer>().iterator(); it.next(); } catch (NoSuchElementException e) { System.out.println(e); }
        try { System.out.printf("%d%n", 3.5); } catch (IllegalFormatConversionException e) { System.out.println(e.getMessage()); }
        try { String.format("%s %s", "a"); } catch (MissingFormatArgumentException e) { System.out.println(e.getMessage()); }
        try { Object[] objs = new Object[-1]; } catch (NegativeArraySizeException e) { System.out.println(e); }
        try { throw new Exception(); } catch (Exception e) { System.out.println(e.getMessage() + " " + e); }
        int[] data = {1, 2, 3};
        System.out.println(data[5]);
    }
}
