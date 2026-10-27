import java.io.IOException;
class MyEx extends Exception { MyEx(String m) { super(m); } }
public class Main {
    static void risky() throws MyEx { throw new MyEx("bad"); }
    static void noDecl() { throw new MyEx("x"); }
    public static void main(String[] args) {
        risky();
        Thread.sleep(100);
        try { System.out.println("x"); } catch (IOException e) { }
        try { risky(); } catch (MyEx e) { } catch (Exception e) { }
        try { risky(); } catch (Exception e) { } catch (MyEx e) { }
        throw new RuntimeException("ok");
    }
}
