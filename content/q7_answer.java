import java.util.LinkedList;
import java.util.Scanner;
import java.util.Stack;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        LinkedList<String> queue = new LinkedList<>();   // FIFO
        Stack<String> served = new Stack<>();             // LIFO, for undo

        while (sc.hasNext()) {
            String cmd = sc.next();
            if (cmd.equals("EXIT")) {
                break;
            } else if (cmd.equals("JOIN")) {
                String name = sc.next();
                queue.offer(name);
                System.out.println(name + " joined the queue (size: " + queue.size() + ")");
            } else if (cmd.equals("SERVE")) {
                if (queue.isEmpty()) {
                    System.out.println("No customers in queue");
                } else {
                    String name = queue.poll();
                    served.push(name);
                    System.out.println("Serving " + name);
                }
            } else if (cmd.equals("UNDO")) {
                if (served.isEmpty()) {
                    System.out.println("Nothing to undo");
                } else {
                    String name = served.pop();
                    queue.addFirst(name);
                    System.out.println(name + " is back at the front");
                }
            } else if (cmd.equals("SHOW")) {
                System.out.println("Queue: " + queue);
            }
        }
        System.out.println("Customers served: " + served.size());
    }
}
